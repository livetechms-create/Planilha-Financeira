import os
import sys
import subprocess
import re
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

def detect_silence(input_file, threshold="-30dB", duration="0.5"):
    cmd = ["ffmpeg", "-i", input_file, "-af", f"silencedetect=noise={threshold}:d={duration}", "-f", "null", "-"]
    result = subprocess.run(cmd, stderr=subprocess.PIPE, text=True)
    output = result.stderr
    starts = re.findall(r"silence_start: ([\d\.]+)", output)
    ends = re.findall(r"silence_end: ([\d\.]+)", output)
    return [float(t) for t in starts], [float(t) for t in ends]

def get_video_info(input_file):
    cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "format=duration:stream=r_frame_rate", "-of", "default=noprint_wrappers=1:nokey=1", input_file]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, text=True).stdout.splitlines()
    fps_str = result[0]
    fps = eval(fps_str) if '/' in fps_str else float(fps_str)
    duration = float(result[1])
    return duration, fps

def generate_xml(input_file, output_xml, keep_clips, fps, duration):
    file_name = os.path.basename(input_file)
    file_url = "file://localhost/" + os.path.abspath(input_file).replace("\\", "/")
    root = Element('xmeml', version="5")
    sequence = SubElement(root, 'sequence', id="sequence-1")
    SubElement(sequence, 'name').text = f"Corte Automático - {file_name}"
    SubElement(sequence, 'duration').text = str(int(duration * fps))
    rate = SubElement(sequence, 'rate')
    SubElement(rate, 'timebase').text = str(int(fps))
    media = SubElement(sequence, 'media')
    video = SubElement(SubElement(media, 'video'), 'track')
    audio_l = SubElement(SubElement(media, 'audio'), 'track')
    audio_r = SubElement(SubElement(media, 'audio'), 'track')
    
    current_frame = 0
    for i, (clip_start, clip_end) in enumerate(keep_clips):
        frames = int((clip_end - clip_start) * fps)
        in_f = int(clip_start * fps)
        out_f = int(clip_end * fps)
        for track in [video, audio_l, audio_r]:
            item = SubElement(track, 'clipitem', id=f"item-{i}")
            SubElement(item, 'name').text = file_name
            SubElement(item, 'start').text = str(current_frame)
            SubElement(item, 'end').text = str(current_frame + frames)
            SubElement(item, 'in').text = str(in_f)
            SubElement(item, 'out').text = str(out_f)
            file_ref = SubElement(item, 'file', id="file-1")
            SubElement(file_ref, 'name').text = file_name
            SubElement(file_ref, 'pathurl').text = file_url
        current_frame += frames
    
    with open(output_xml, "w", encoding="utf-8") as f:
        f.write(minidom.parseString(tostring(root)).toprettyxml(indent="  "))

if __name__ == "__main__":
    v_in = sys.argv[1]
    thresh = sys.argv[2]
    dur = sys.argv[3]
    output = os.path.splitext(v_in)[0] + "_premiere.xml"
    
    starts, ends = detect_silence(v_in, thresh, dur)
    total_dur, fps = get_video_info(v_in)
    if len(starts) > len(ends): ends.append(total_dur)
    
    keeps = []
    last = 0.0
    for s, e in zip(starts, ends):
        if s > last: keeps.append((last, s))
        last = e
    if last < total_dur: keeps.append((last, total_dur))
    
    generate_xml(v_in, output, keeps, fps, total_dur)
    print("Done")

import os
import subprocess
import re
import math
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

def detect_silence(input_file, threshold="-30dB", duration="0.5"):
    print(f"⏳ Analisando '{input_file}' para detectar silêncios...")
    cmd = [
        "ffmpeg", "-i", input_file, 
        "-af", f"silencedetect=noise={threshold}:d={duration}", 
        "-f", "null", "-"
    ]
    
    result = subprocess.run(cmd, stderr=subprocess.PIPE, text=True)
    output = result.stderr

    starts = re.findall(r"silence_start: ([\d\.]+)", output)
    ends = re.findall(r"silence_end: ([\d\.]+)", output)

    return [float(t) for t in starts], [float(t) for t in ends]

def get_video_info(input_file):
    # Pega duração e framerate
    cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0", 
        "-show_entries", "format=duration:stream=r_frame_rate", "-of", 
        "default=noprint_wrappers=1:nokey=1", input_file
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, text=True).stdout.splitlines()
    
    # ffprobe retorna framerate como uma fração "30000/1001" ou "30/1"
    fps_str = result[0]
    if '/' in fps_str:
        num, den = map(int, fps_str.split('/'))
        fps = num / den
    else:
        fps = float(fps_str)
        
    duration = float(result[1])
    return duration, fps

def seconds_to_frames(seconds, fps):
    return int(round(seconds * fps))

def generate_xml(input_file, output_xml, keep_clips, fps, duration):
    # Premiere Pro usa o formato XML do Final Cut Pro (FCP XML 7)
    file_name = os.path.basename(input_file)
    abs_path = os.path.abspath(input_file)
    file_url = "file://localhost/" + abs_path.replace("\\", "/")
    
    root = Element('xmeml', version="5")
    sequence = SubElement(root, 'sequence', id="sequence-1")
    SubElement(sequence, 'name').text = f"Corte Automático - {file_name}"
    SubElement(sequence, 'duration').text = str(seconds_to_frames(duration, fps))
    
    rate = SubElement(sequence, 'rate')
    SubElement(rate, 'ntsc').text = "FALSE"
    SubElement(rate, 'timebase').text = str(int(fps))
    
    media = SubElement(sequence, 'media')
    video = SubElement(media, 'video')
    track = SubElement(video, 'track')
    
    audio = SubElement(media, 'audio')
    track_audio_l = SubElement(audio, 'track')
    track_audio_r = SubElement(audio, 'track')

    current_timeline_frame = 0

    for i, (clip_start, clip_end) in enumerate(keep_clips):
        clip_duration_frames = seconds_to_frames(clip_end - clip_start, fps)
        in_frame = seconds_to_frames(clip_start, fps)
        out_frame = seconds_to_frames(clip_end, fps)
        
        # Elemento de Vídeo
        clip_id = f"clipitem-{i}"
        clipitem = SubElement(track, 'clipitem', id=clip_id)
        SubElement(clipitem, 'name').text = file_name
        SubElement(clipitem, 'duration').text = str(seconds_to_frames(duration, fps))
        SubElement(clipitem, 'rate').extend([Element('timebase'), Element('ntsc')])
        clipitem.find('rate/timebase').text = str(int(fps))
        clipitem.find('rate/ntsc').text = "FALSE"
        
        SubElement(clipitem, 'start').text = str(current_timeline_frame)
        SubElement(clipitem, 'end').text = str(current_timeline_frame + clip_duration_frames)
        SubElement(clipitem, 'in').text = str(in_frame)
        SubElement(clipitem, 'out').text = str(out_frame)
        
        file_elem = SubElement(clipitem, 'file', id="file-1")
        SubElement(file_elem, 'name').text = file_name
        SubElement(file_elem, 'pathurl').text = file_url
        SubElement(file_elem, 'rate').extend([Element('timebase'), Element('ntsc')])
        file_elem.find('rate/timebase').text = str(int(fps))
        file_elem.find('rate/ntsc').text = "FALSE"
        SubElement(file_elem, 'duration').text = str(seconds_to_frames(duration, fps))
        
        # Audio Tracks (L e R)
        for audio_track in [track_audio_l, track_audio_r]:
            a_clipitem = SubElement(audio_track, 'clipitem', id=f"a{clip_id}")
            SubElement(a_clipitem, 'name').text = file_name
            SubElement(a_clipitem, 'duration').text = str(seconds_to_frames(duration, fps))
            SubElement(a_clipitem, 'rate').extend([Element('timebase'), Element('ntsc')])
            a_clipitem.find('rate/timebase').text = str(int(fps))
            a_clipitem.find('rate/ntsc').text = "FALSE"
            SubElement(a_clipitem, 'start').text = str(current_timeline_frame)
            SubElement(a_clipitem, 'end').text = str(current_timeline_frame + clip_duration_frames)
            SubElement(a_clipitem, 'in').text = str(in_frame)
            SubElement(a_clipitem, 'out').text = str(out_frame)
            a_clipitem.append(file_elem) # Reutiliza a referência do arquivo

        current_timeline_frame += clip_duration_frames

    # Formatar e salvar
    xml_str = minidom.parseString(tostring(root)).toprettyxml(indent="  ")
    with open(output_xml, "w", encoding="utf-8") as f:
        f.write(xml_str)

def process_for_premiere(input_file, threshold="-30dB", silence_duration="0.5"):
    if not os.path.exists(input_file):
        print(f"❌ Arquivo '{input_file}' não encontrado.")
        return

    starts, ends = detect_silence(input_file, threshold, silence_duration)
    total_duration, fps = get_video_info(input_file)
    
    if len(starts) > len(ends):
        ends.append(total_duration)

    keep_clips = []
    last_end = 0.0

    for s, e in zip(starts, ends):
        if s > last_end:
            keep_clips.append((last_end, s))
        last_end = e
        
    if last_end < total_duration:
        keep_clips.append((last_end, total_duration))

    if not keep_clips:
        print("✅ Nenhum corte necessário.")
        return

    output_xml = os.path.splitext(input_file)[0] + "_premiere.xml"
    print(f"✂️ Gerando arquivo XML para o Premiere: {output_xml}")
    generate_xml(input_file, output_xml, keep_clips, fps, total_duration)
    print(f"🚀 Pronto! Importe o arquivo '{output_xml}' no Adobe Premiere Pro.")

if __name__ == "__main__":
    # ==========================================
    # ⚙️ CONFIGURAÇÕES
    # ==========================================
    VIDEO_ENTRADA = "REVELAÇÃO 18-09-25.mp4" 
    VOLUME_THRESHOLD = "-35dB" 
    SILENCE_MIN_DURATION = "0.5" 
    # ==========================================
    
    process_for_premiere(VIDEO_ENTRADA, VOLUME_THRESHOLD, SILENCE_MIN_DURATION)

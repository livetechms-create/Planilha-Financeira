import os
import subprocess
import re
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom
import threading

# --- Lógica de Processamento (Copiada do script anterior) ---

def detect_silence(input_file, threshold="-30dB", duration="0.5", log_func=None):
    if log_func: log_func(f"⏳ Analisando silêncios (Threshold: {threshold}, Duração: {duration}s)...")
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
    cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0", 
        "-show_entries", "format=duration:stream=r_frame_rate", "-of", 
        "default=noprint_wrappers=1:nokey=1", input_file
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, text=True).stdout.splitlines()
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
            a_clipitem.append(file_elem)

        current_timeline_frame += clip_duration_frames

    xml_str = minidom.parseString(tostring(root)).toprettyxml(indent="  ")
    with open(output_xml, "w", encoding="utf-8") as f:
        f.write(xml_str)

# --- Interface Gráfica ---

class AutoCutGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Corte Automático para Premiere")
        self.root.geometry("600x450")
        self.root.configure(bg="#f0f0f0")

        # Variáveis
        self.video_path = tk.StringVar()
        self.threshold = tk.StringVar(value="-35")
        self.min_duration = tk.StringVar(value="0.5")

        self.setup_ui()

    def setup_ui(self):
        style = ttk.Style()
        style.configure("TButton", padding=6)
        style.configure("Main.TFrame", background="#f0f0f0")

        main_frame = ttk.Frame(self.root, style="Main.TFrame", padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Seleção de Arquivo
        ttk.Label(main_frame, text="Vídeo de Entrada:", background="#f0f0f0").pack(anchor="w")
        file_frame = ttk.Frame(main_frame, style="Main.TFrame")
        file_frame.pack(fill=tk.X, pady=(0, 15))
        
        ttk.Entry(file_frame, textvariable=self.video_path).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        ttk.Button(file_frame, text="Procurar...", command=self.browse_file).pack(side=tk.RIGHT)

        # Configurações
        config_frame = ttk.LabelFrame(main_frame, text=" Configurações de Áudio ", padding="10")
        config_frame.pack(fill=tk.X, pady=10)

        # Threshold
        ttk.Label(config_frame, text="Sensibilidade (Silêncio em dB):").grid(row=0, column=0, sticky="w", pady=5)
        ttk.Entry(config_frame, textvariable=self.threshold, width=10).grid(row=0, column=1, sticky="w", padx=10)
        ttk.Label(config_frame, text="(Ex: -35 é padrão, -50 é mais sensível)").grid(row=0, column=2, sticky="w")

        # Duração
        ttk.Label(config_frame, text="Duração Mínima (segundos):").grid(row=1, column=0, sticky="w", pady=5)
        ttk.Entry(config_frame, textvariable=self.min_duration, width=10).grid(row=1, column=1, sticky="w", padx=10)
        ttk.Label(config_frame, text="(Tempo de silêncio para cortar)").grid(row=1, column=2, sticky="w")

        # Botão Processar
        self.btn_process = ttk.Button(main_frame, text="GERAR XML PARA PREMIERE", command=self.start_processing)
        self.btn_process.pack(fill=tk.X, pady=20)

        # Log de Saída
        ttk.Label(main_frame, text="Status:", background="#f0f0f0").pack(anchor="w")
        self.log_text = tk.Text(main_frame, height=8, state='disabled', bg="#ffffff")
        self.log_text.pack(fill=tk.BOTH, expand=True)

    def browse_file(self):
        filename = filedialog.askopenfilename(filetypes=[("Vídeos", "*.mp4 *.mov *.mkv *.avi"), ("Todos os arquivos", "*.*")])
        if filename:
            self.video_path.set(filename)

    def log(self, message):
        self.log_text.config(state='normal')
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.log_text.config(state='disabled')
        self.root.update_idletasks()

    def start_processing(self):
        video = self.video_path.get()
        if not video or not os.path.exists(video):
            messagebox.showerror("Erro", "Por favor, selecione um vídeo válido.")
            return

        self.btn_process.config(state='disabled')
        # Rodar em thread para não travar a interface
        thread = threading.Thread(target=self.process)
        thread.start()

    def process(self):
        try:
            video = self.video_path.get()
            thresh = f"{self.threshold.get()}dB"
            dur = self.min_duration.get()

            self.log(f"🚀 Iniciando processamento: {os.path.basename(video)}")
            
            starts, ends = detect_silence(video, thresh, dur, log_func=self.log)
            total_duration, fps = get_video_info(video)
            
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
                self.log("❌ Nenhum som detectado ou configurações muito rígidas.")
                return

            output_xml = os.path.splitext(video)[0] + "_premiere.xml"
            self.log(f"✂️ Gerando XML com {len(keep_clips)} clips...")
            generate_xml(video, output_xml, keep_clips, fps, total_duration)
            
            self.log(f"✅ SUCESSO! Arquivo gerado em:\n{output_xml}")
            self.log("\nINSTRUÇÕES:\n1. Abra o Premiere\n2. Importe (Ctrl+I) este arquivo XML\n3. Uma sequência pronta aparecerá no projeto.")
            
            messagebox.showinfo("Sucesso", f"XML gerado com sucesso!\n\nImporte o arquivo no Premiere:\n{os.path.basename(output_xml)}")

        except Exception as e:
            self.log(f"🔴 ERRO: {str(e)}")
            messagebox.showerror("Erro no Processamento", str(e))
        finally:
            self.btn_process.config(state='normal')

if __name__ == "__main__":
    root = tk.Tk()
    app = AutoCutGUI(root)
    root.mainloop()

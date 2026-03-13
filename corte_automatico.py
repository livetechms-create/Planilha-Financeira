import os
import subprocess
import re

def detect_silence(input_file, threshold="-30dB", duration="0.5"):
    print(f"⏳ Analisando '{input_file}' para detectar silêncios...")
    cmd = [
        "ffmpeg", "-i", input_file, 
        "-af", f"silencedetect=noise={threshold}:d={duration}", 
        "-f", "null", "-"
    ]
    
    # O comando FFmpeg exibe as saídas no stderr
    result = subprocess.run(cmd, stderr=subprocess.PIPE, text=True)
    output = result.stderr

    starts = re.findall(r"silence_start: ([\d\.]+)", output)
    ends = re.findall(r"silence_end: ([\d\.]+)", output)

    return [float(t) for t in starts], [float(t) for t in ends]

def get_duration(input_file):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", 
        "format=duration", "-of", 
        "default=noprint_wrappers=1:nokey=1", input_file
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, text=True)
    return float(result.stdout.strip())

def process_video(input_file, output_file, threshold="-30dB", duration="0.5"):
    starts, ends = detect_silence(input_file, threshold, duration)
    total_duration = get_duration(input_file)
    
    # Se o vídeo terminar em silêncio, adicionamos o final manualmente
    if len(starts) > len(ends):
        ends.append(total_duration)

    if not starts:
        print("✅ Nenhum silêncio detectado. O vídeo já parece estar sem pausas.")
        return

    # O que precisamos separar são as partes "MANTIDAS" (com áudio)
    keep_clips = []
    last_end = 0.0

    for s, e in zip(starts, ends):
        if s > last_end:
            keep_clips.append((last_end, s))
        last_end = e
        
    if last_end < total_duration:
        keep_clips.append((last_end, total_duration))

    print(f"✂️ Encontrados {len(starts)} pausas. Gerando {len(keep_clips)} partes úteis do vídeo...")

    temp_files = []
    for i, (clip_start, clip_end) in enumerate(keep_clips):
        temp_name = f"temp_parte_{i}.mp4"
        temp_files.append(temp_name)
        print(f"   ▶ Extraindo parte {i+1}: de {clip_start:.2f}s até {clip_end:.2f}s")
        # Cortando e re-ecodando para garantir precisão do corte exato
        cmd = [
            "ffmpeg", "-y", "-i", input_file, 
            "-ss", str(clip_start), "-to", str(clip_end), 
            "-c:v", "libx264", "-c:a", "aac", 
            temp_name
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
    # Criar um arquivo txt de lista temporário para colar os pedaços
    with open("list.txt", "w", encoding="utf-8") as f:
        for tmp in temp_files:
            f.write(f"file '{tmp}'\n")

    print(f"🎬 Unindo e renderizando o arquivo final: {output_file}...")
    cmd_concat = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", 
        "-i", "list.txt", "-c", "copy", output_file
    ]
    subprocess.run(cmd_concat, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Limpeza de arquivos temporários
    print("🧹 Limpando os arquivos temporários...")
    os.remove("list.txt")
    for tmp in temp_files:
        os.remove(tmp)

    print("🚀 Vídeo finalizado com SUCESSO! Edição cortada e salva.")

if __name__ == "__main__":
    # ==========================================
    # ⚙️ CONFIGURAÇÕES DO SCRIPT
    # ==========================================
    # Nome do arquivo de entrada (Mude para o nome do seu arquivo)
    VIDEO_ENTRADA = "meu_video.mp4" 
    
    # Nome do novo arquivo salvo sem os silêncios
    VIDEO_SAIDA = "video_cortado.mp4" 
    
    # Volume em que começa a considerar "silêncio" (ex: -30dB). Adicionar mais negativo é menos sensível.
    VOLUME = "-30dB" 
    
    # Tempo mínimo de pausa (em segundos) para considerar cortar (ex: 0.5 segundos)
    DURACAO_MINIMA = "0.5" 
    # ==========================================
    
    if not os.path.exists(VIDEO_ENTRADA):
        print(f"❌ O arquivo '{VIDEO_ENTRADA}' não foi encontrado!")
        print(f"🔹 Dica: Coloque o script e o seu vídeo na mesma pasta e confirme o nome na variável 'VIDEO_ENTRADA'.")
    else:
        process_video(VIDEO_ENTRADA, VIDEO_SAIDA, threshold=VOLUME, duration=DURACAO_MINIMA)

import sys
import json
import re
from spellchecker import SpellChecker

def check_texts(text_data_list):
    # Inicializa para português
    spell = SpellChecker(language='pt')
    
    results = []
    
    for item in text_data_list:
        text = item['text']
        # Limpa o texto para pegar palavras
        words = re.findall(r'\b\w+\b', text)
        misspelled = spell.unknown(words)
        
        corrections = []
        for word in misspelled:
            suggestion = spell.correction(word)
            if suggestion and suggestion.lower() != word.lower():
                corrections.append({
                    "original": word,
                    "suggestion": suggestion
                })
        
        results.append({
            "id": item['id'],
            "original": text,
            "errors": corrections
        })
    
    return results

if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_json = sys.argv[1]
        try:
            data = json.loads(input_json)
            output = check_texts(data)
            print(json.dumps(output))
        except Exception as e:
            print(json.dumps({"error": str(e)}))

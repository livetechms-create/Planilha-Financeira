// host.jsx - SpellCheck Extension

function getTextItemsFromSequence() {
    var activeSeq = app.project.activeSequence;
    if (!activeSeq) return "no_sequence";

    var results = [];
    var videoTracks = activeSeq.videoTracks;

    for (var i = 0; i < videoTracks.numTracks; i++) {
        var track = videoTracks[i];
        var clips = track.clips;
        for (var j = 0; j < clips.numItems; j++) {
            var clip = clips[j];
            
            // Verifica se é um item de Gráficos Essenciais (MOGRT ou Text)
            var components = clip.getComponents();
            if (components) {
                for (var k = 0; k < components.numItems; k++) {
                    var component = components[k];
                    // Procura por propriedades de texto
                    var properties = component.properties;
                    for (var p = 0; p < properties.numItems; p++) {
                        var prop = properties[p];
                        // No Premiere moderno, buscamos a propriedade de texto
                        if (prop.displayName === "Source Text" || prop.displayName === "Texto de Origem") {
                            var textValue = prop.getValue();
                            // Estrutura: trackIndex|clipIndex|componentIndex|propIndex
                            var uid = i + "|" + j + "|" + k + "|" + p;
                            results.push({
                                id: uid,
                                text: textValue
                            });
                        }
                    }
                }
            }
        }
    }
    return JSON.stringify(results);
}

function updateTextInSequence(uid, newText) {
    var parts = uid.split("|");
    var trackIdx = parseInt(parts[0]);
    var clipIdx = parseInt(parts[1]);
    var compIdx = parseInt(parts[2]);
    var propIdx = parseInt(parts[3]);

    var activeSeq = app.project.activeSequence;
    if (activeSeq) {
        var prop = activeSeq.videoTracks[trackIdx].clips[clipIdx].getComponents()[compIdx].properties[propIdx];
        prop.setValue(newText);
        return "ok";
    }
    return "error";
}

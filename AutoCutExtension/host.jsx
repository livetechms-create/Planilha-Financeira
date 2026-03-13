// host.jsx

function getActiveSequenceFilePath() {
    var activeSeq = app.project.activeSequence;
    if (activeSeq) {
        var videoTrack = activeSeq.videoTracks[0];
        if (videoTrack && videoTrack.clips.length > 0) {
            var firstClip = videoTrack.clips[0];
            var projectItem = firstClip.projectItem;
            if (projectItem) {
                return projectItem.getMediaPath();
            }
        }
    }
    return "false";
}

function importXMLToProject(path) {
    if (path) {
        app.project.importFiles([path], true, app.project.getInsertionBin(), false);
    }
}

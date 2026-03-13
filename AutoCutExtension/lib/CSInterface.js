/**
 * Minimal CSInterface.js for basic ExtendScript communication
 */
function CSInterface() {}

CSInterface.prototype.evalScript = function(script, callback) {
    if (typeof callback === 'undefined') {
        callback = function(result) {};
    }
    window.__adobe_cep__.evalScript(script, callback);
};

CSInterface.prototype.getApplicationID = function() {
    return window.__adobe_cep__.getApplicationID();
};

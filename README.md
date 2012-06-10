# Telepresence

Wrapping the entire DOM in a Proxy membrane and then loading arbitrary code on top of it, fully instrumented. Events are emitted for every action, piped over a websocket to a Node.js server, and then sent out to other clients. The result is a perfectly synced DOM.

# Live Demo
If the server isn't blown up, you can try a live demo here: http://bbenvie.com:8080.

# Requirements

Firefox 12+ or Chrome 18+ with _about:flags_ __Experimental JavaScript__ enabled.
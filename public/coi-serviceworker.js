/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

    self.addEventListener("message", (ev) => {
        if (!ev.data) {
            return;
        } else if (ev.data.type === "deregister") {
            self.registration.unregister().then(() => {
                return self.clients.matchAll();
            }).then(clients => {
                clients.forEach((client) => client.navigate(client.url));
            });
        }
    });

    self.addEventListener("fetch", function (event) {
        const r = event.request;
        if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
            return;
        }

        const coep = coepCredentialless ? "credentialless" : "require-corp";

        event.respondWith(
            fetch(r).then((response) => {
                if (response.status === 0) {
                    return response;
                }

                const newHeaders = new Headers(response.headers);
                newHeaders.set("Cross-Origin-Embedder-Policy", coep);
                newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            })
        );
    });

} else {
    // Adapter for client code
    (async function () {
        if (window.crossOriginIsolated) {
            console.log("Integrity check: crossOriginIsolated is true. COI active.");
            return;
        }

        // Guard against infinite loops
        if (window.sessionStorage.getItem("coiReloaded")) {
            console.warn("COI Service Worker reloaded but privacy headers are still missing. GitHub Pages or browser restrictions might be interfering with SharedArrayBuffer.");
            // We do NOT return here effectively, we let it try to register again just in case,
            // but we stop the RELOAD loop below.
        }

        const n = navigator;
        if (n.serviceWorker) {
            try {
                // Ensure we register with the correct relative path
                const registration = await n.serviceWorker.register(window.document.currentScript.src || "./coi-serviceworker.js");
                console.log("COI SW Registered");

                // If it's already active, (and we aren't isolated), we might need a reload.
                // But check the loop guard.
                if (registration.active && !n.serviceWorker.controller) {
                    console.log("COI SW Active, checking reload guard...");
                    if (!window.sessionStorage.getItem("coiReloaded")) {
                        window.sessionStorage.setItem("coiReloaded", "true");
                        console.log("Reloading to activate COI...");
                        window.location.reload();
                    }
                }

                registration.addEventListener("updatefound", () => {
                    const worker = registration.installing;
                    worker.addEventListener("statechange", () => {
                        if (worker.state === "activated" && !n.serviceWorker.controller) {
                            if (!window.sessionStorage.getItem("coiReloaded")) {
                                window.sessionStorage.setItem("coiReloaded", "true");
                                console.log("COI SW Activated, reloading...");
                                window.location.reload();
                            }
                        }
                    });
                });

            } catch (err) {
                console.error("COI SW Register Failed", err);
            }
        }
    })();
}

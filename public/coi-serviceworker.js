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
    const n = navigator;
    if (window.crossOriginIsolated !== false) {
        // We are active!
    } else {
        if (n.serviceWorker) {
            n.serviceWorker.register(window.document.currentScript.src).then(
                (r) => {
                    console.log("COI Service Worker registered");
                    if (r.active && !n.serviceWorker.controller) {
                        window.location.reload();
                    }
                },
                (err) => {
                    console.error("COI Service Worker failed to register", err);
                }
            );
        }
    }
}

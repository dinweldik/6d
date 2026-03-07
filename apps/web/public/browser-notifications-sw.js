self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const path =
    event.notification &&
    event.notification.data &&
    typeof event.notification.data.path === "string"
      ? event.notification.data.path
      : "/";
  const targetUrl = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          const navigate = "navigate" in client ? client.navigate(targetUrl) : Promise.resolve();
          return Promise.resolve(navigate).catch(() => undefined).then(() => client.focus());
        }
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});

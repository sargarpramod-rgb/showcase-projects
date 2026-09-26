import config from "../config/config";

const backendUrl = (path) => `${(config.API_BASE || "").replace(/\/$/, "")}${path}`;
let csrfRequest = null;

// Share concurrent token acquisition, but fetch afresh for each later mutation.
async function csrfHeaders() {
  if (!csrfRequest) {
    csrfRequest = fetch(backendUrl("/auth/csrf"), {
      credentials: "include",
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new Error("Unable to obtain CSRF token.");
      const csrf = await response.json();
      return { [csrf.headerName]: csrf.token };
    }).finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
}

export async function backendFetch(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = await csrfHeaders();
    Object.entries(csrf).forEach(([name, value]) => headers.set(name, value));
  }
  return fetch(backendUrl(path), { ...options, headers, credentials: "include" });
}

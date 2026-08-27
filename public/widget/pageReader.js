function readDynamicPage(url, timeoutMs = 4000) {
  const iframeRead = new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";

    iframe.src = url + (url.includes("?") ? "&" : "?") + "widgetronRead=1";

    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument;
        const text = doc.body.innerText;
        document.body.removeChild(iframe);

        if (
          !text.trim() ||
          /^Cannot (GET|POST|PUT|DELETE)/i.test(text.trim())
        ) {
          reject(new Error(`No real content at ${url} (likely a 404)`));
          return;
        }

        resolve(text);
      } catch (err) {
        document.body.removeChild(iframe);
        reject(new Error(`Could not read ${url} — likely cross-origin`));
      }
    };

    iframe.onerror = () => {
      document.body.removeChild(iframe);
      reject(new Error(`Failed to load ${url}`));
    };

    document.body.appendChild(iframe);
  });

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out reading ${url}`)), timeoutMs),
  );

  return Promise.race([iframeRead, timeout]);
}

function readMultiplePages(urls, { timeoutMs = 4000 } = {}) {
  const pagePromises = urls.map((url) => {
    return readDynamicPage(url, timeoutMs)
      .then((content) => {
        return { url, status: "success", content };
      })
      .catch((err) => {
        return { url, status: "failed", error: err.message };
      });
  });
  return Promise.allSettled(pagePromises).then((results) => {
    return results.map((result) => result.value);
  });
}

async function fetchConfiguredAPIs(apiConfigs = [], { timeoutMs = 4000 } = {}) {
  const fetchPromises = apiConfigs.map((config) => {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    return fetch(config.url, {
      headers: config.headers,
      signal: controller.signal,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json().then((data) => ({
          name: config.name,
          status: "success",
          data,
        }));
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        const isTimeout = err.name === "AbortError";

        return {
          name: config.name,
          status: "failed",
          error: isTimeout ? "Request timed out" : err.message,
        };
      });
  });
  return Promise.allSettled(fetchPromises).then((results) => {
    return results.map((result) => result.value);
  });
}

async function gatherFullContext({
  pageUrls = [],
  apiConfigs = [],
  timeoutMs = 4000,
} = {}) {
  return Promise.all([
    readMultiplePages(pageUrls, { timeoutMs }),
    fetchConfiguredAPIs(apiConfigs, { timeoutMs }),
  ]).then(([pageResult, apiResult]) => {
    return {
      pages: pageResult,
      apis: apiResult,
    };
  });
}

if (typeof module !== "undefined") {
  module.exports = {
    readDynamicPage,
    readMultiplePages,
    fetchConfiguredAPIs,
    gatherFullContext,
  };
}

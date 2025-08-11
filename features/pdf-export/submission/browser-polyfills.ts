export function setupBrowserPolyfills() {
  if (typeof window === "undefined") {
    // Mock XMLHttpRequest
    global.XMLHttpRequest = class XMLHttpRequest {
      open() {}
      send() {}
      setRequestHeader() {}
      onreadystatechange = null;
      readyState = 4;
      status = 200;
      responseText = "";
    } as unknown as typeof XMLHttpRequest;

    // Mock Image API
    global.Image = class Image {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      src: string = "";
      width: number = 0;
      height: number = 0;

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    } as unknown as typeof Image;

    // Add other browser APIs as needed
    global.btoa = (str) => Buffer.from(str).toString("base64");
    global.atob = (str) => Buffer.from(str, "base64").toString();
  }
}

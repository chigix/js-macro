import Modules from "modules";

export default function () {

  if (Modules.has("check")) {
    const check = Modules.importNow("check");
    check();
    if (Modules.has("app")) {
      Modules.importNow("app");
    } else {
      trace("app module is still not installed");
    }
  } else {
    trace("Device flashed. Ready to install apps.\n");
  }

}

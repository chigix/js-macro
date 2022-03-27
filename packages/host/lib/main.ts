import Modules from "modules";

export default function () {
	if (Modules.has("check")) {
		const check = Modules.importNow("check") as () => void;
		check();
		console.log(check);
		if (Modules.has("example"))
			Modules.importNow("example");
	} else {
		trace("Device flashed. Ready to install apps.\n");
	}
}
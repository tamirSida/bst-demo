import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

// Next.js App Router injects the Font Awesome CSS itself (imported above),
// so disable the runtime auto-insertion to avoid the icon "flash of huge icon".
config.autoAddCss = false;

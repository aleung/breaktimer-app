import path from "path";
import moment from "moment";
import { app, dialog, Menu, Tray } from "electron";

import packageJson from "../../../package.json";
import { getSettings } from "./store";
import { createSettingsWindow } from "./windows";
import {
  OptionalTime,
  getBreakTime,
  startBreakNow,
  createBreak,
  getDndEndTime,
  setDndEndTime,
} from "./breaks";

let tray: Tray;
let lastMinsLeft = 0;

/**
 * Returns the path to the tray icon based on the status and the remaining minutes.
 *
 * @param status - The status of the tray icon.
 * @param {number} [minsLeft] - The remaining minutes. Only used when the status is 'active'.
 * @return {string} The path to the tray icon.
 */
function getTrayIconPath(
  status: "disabled" | "active" | "postponed",
  minsLeft?: number
): string {
  const settings = getSettings();

  let trayIconFileName = "icon.png";

  if (process.platform === "darwin") {
    trayIconFileName = "tray-IconTemplate.png";
  } else {
    switch (status) {
      case "disabled":
        trayIconFileName = "icon-disabled.png";
        break;
      case "postponed":
        trayIconFileName = "icon-empty.png";
        break;
      case "active":
        if (minsLeft !== undefined) {
          if (minsLeft < settings.almostEmptyTrayMinutes) {
            trayIconFileName = "icon-almost-empty.png";
          } else if (minsLeft < settings.halfFullTrayMinutes) {
            trayIconFileName = "icon-half-full.png";
          }
        }
        break;
    }
  }

  return process.env.NODE_ENV === "development"
    ? path.join("resources", "tray", trayIconFileName)
    : path.join(process.resourcesPath, "tray", trayIconFileName);
}

export function buildTray(): void {
  if (!tray) {
    const trayIconPath = getTrayIconPath("disabled");
    tray = new Tray(trayIconPath);

    // On windows, context menu will not show on left click by default
    if (process.platform === "win32") {
      tray.on("click", () => {
        tray.popUpContextMenu();
      });
    }
  }

  const updateDndEndTime = (dndEndTime: OptionalTime): void => {
    setDndEndTime(dndEndTime);
    buildTray();
  };

  const createAboutWindow = (): void => {
    dialog.showMessageBox({
      title: "About",
      type: "info",
      message: `BreakTimer`,
      detail: `Build: ${packageJson.version}\n\nWebsite:\nhttps://breaktimer.app\n\nSource Code:\nhttps://github.com/tom-james-watson/breaktimer-app\n\nDistributed under GPL-3.0-or-later license.`,
    });
  };

  const quit = (): void => {
    setTimeout(() => {
      app.exit(0);
    });
  };

  const [breakTime, postponedCount] = getBreakTime();
  const minsLeft = breakTime?.diff(moment(), "minutes");

  let toolTip = "";

  if (getDndEndTime().isAfter()) {
    toolTip = `Do not disturb ${getDndEndTime().fromNow()} (${getDndEndTime().format(
      "HH:mm"
    )})`;
    tray.setImage(getTrayIconPath("disabled"));
  } else {
    if (minsLeft !== undefined) {
      if (minsLeft > 1) {
        toolTip = `Next break in ${minsLeft} minutes`;
      } else if (minsLeft === 1) {
        toolTip = `Next break in 1 minute`;
      } else {
        toolTip = `Next break in less than a minute`;
      }
    }
    if (postponedCount > 0) {
      tray.setImage(getTrayIconPath("postponed"));
    } else {
      tray.setImage(getTrayIconPath("active", minsLeft));
    }
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: toolTip,
      visible: toolTip !== "",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Stop DND",
      click: updateDndEndTime.bind(null, null),
      visible: getDndEndTime().isAfter(),
    },
    {
      label: "Do not disturb...",
      submenu: [
        {
          label: "Untill the next hour",
          click: () => updateDndEndTime(moment().endOf("hour")),
        },
        {
          label: "30 minutes",
          click: () => updateDndEndTime(moment().add(30, "minutes")),
        },
        {
          label: "1 hour",
          click: () => updateDndEndTime(moment().add(60, "minutes")),
        },
        {
          label: "2 hours",
          click: () => updateDndEndTime(moment().add(2, "hours")),
        },
        {
          label: "4 hours",
          click: () => updateDndEndTime(moment().add(4, "hours")),
        },
        {
          label: "Rest of the day",
          click: () => updateDndEndTime(moment().endOf("day")),
        },
      ],
      visible: getDndEndTime().isBefore(),
    },
    {
      label: "Start break now",
      visible: breakTime !== null,
      click: startBreakNow,
    },
    {
      label: "Restart break period",
      visible: breakTime !== null,
      click: createBreak.bind(null, false),
    },
    { type: "separator" },
    { label: "Settings...", click: createSettingsWindow },
    { label: "About...", click: createAboutWindow },
    { label: "Quit", click: quit },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(toolTip);
}

export function initTray(): void {
  buildTray();
  setInterval(() => {
    const [breakTime, _postponedCount] = getBreakTime();
    if (breakTime === null) {
      return;
    }

    const minsLeft = breakTime.diff(moment(), "minutes");
    if (minsLeft !== lastMinsLeft) {
      buildTray();
      lastMinsLeft = minsLeft;
    }
  }, 5000);
}

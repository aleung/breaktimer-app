import moment from "moment";
import { PowerMonitor } from "electron";
import log from "electron-log";

import { Settings, NotificationType } from "../../types/settings";
import { BreakTime } from "../../types/breaks";
import { IpcChannel } from "../../types/ipc";
import { sendIpc } from "./ipc";
import { getSettings } from "./store";
import { buildTray } from "./tray";
import { showNotification } from "./notifications";
import { createBreakWindows } from "./windows";

let powerMonitor: PowerMonitor;
let breakTime: BreakTime = null;
let havingBreak = false;
let postponedCount = 0;
let lastActiveTime = 0;

export function getBreakTime(): BreakTime {
  return breakTime;
}

export function getBreakLength(): Date {
  const settings: Settings = getSettings();
  return settings.breakLength;
}

function getSeconds(date: Date): number {
  return (
    date.getHours() * 60 * 60 + date.getMinutes() * 60 + date.getSeconds() || 1
  ); // can't be 0
}

function getIdleResetSeconds(): number {
  const settings: Settings = getSettings();
  return getSeconds(new Date(settings.idleResetLength));
}

/**
 * Set next break time
 * @param isPostpone Whether or not the break is being postponed
 */
export function createBreak(isPostpone = false): void {
  postponedCount = 0;

  const settings: Settings = getSettings();
  const freq = new Date(
    isPostpone ? settings.postponeLength : settings.breakFrequency
  );

  breakTime = moment()
    .add(freq.getHours(), "hours")
    .add(freq.getMinutes(), "minutes")
    .add(freq.getSeconds(), "seconds");

  buildTray();
}

export function endPopupBreak(): void {
  if (breakTime !== null && breakTime < moment()) {
    breakTime = null;
    havingBreak = false;
    postponedCount = 0;
  }
}

export function getAllowPostpone(): boolean {
  const settings = getSettings();
  return !settings.postponeLimit || postponedCount < settings.postponeLimit;
}

export function postponeBreak(): void {
  postponedCount++;
  havingBreak = false;
  createBreak(true);
}

/**
 * Start a break
 */
function doBreak(): void {
  havingBreak = true;

  const settings: Settings = getSettings();

  if (settings.notificationType === NotificationType.Notification) {
    // show a notification and schedule the next break
    showNotification(settings.breakTitle, settings.breakMessage);
    if (settings.gongEnabled) {
      sendIpc(IpcChannel.GongStartPlay);
    }
    havingBreak = false;
    createBreak();
  }

  if (settings.notificationType === NotificationType.Popup) {
    createBreakWindows();
  }
}

enum IdleState {
  Active = "active",
  Idle = "idle",
  Locked = "locked",
  Unknown = "unknown",
}

/**
 * Check whether the computer has been idle long enough to reset a break.
 * @returns {boolean} true - reset
 */
function checkIdleReset(): boolean {
  const settings: Settings = getSettings();

  if (!settings.idleResetEnabled) {
    return false;
  }

  const state = powerMonitor.getSystemIdleState(1) as IdleState;

  if (state === IdleState.Active) {
    lastActiveTime = Date.now();
  } else {
    if (lastActiveTime) {
      const idleSeconds = (Date.now() - lastActiveTime) / 1000;
      if (idleSeconds > getIdleResetSeconds()) {
        lastActiveTime = 0;
        return true;
      }
    }
  }

  return false;
}

export function startBreakNow(): void {
  breakTime = moment();
}

function tick(): void {
  log.debug("tick - (now, breakTime)：", moment(), breakTime);

  if (havingBreak) {
    // we do nothing when it's in a break
  } else if (!getSettings().breaksEnabled) {
    // clear break if breaks are disabled
    breakTime = null;
  } else if (breakTime && moment() > breakTime) {
    // it's time to have a break
    log.info("It's time to have a break");
    doBreak();
  } else if (checkIdleReset() || !breakTime) {
    // idle reset or no break, create next break
    log.info("Create next break");
    createBreak();
  }

  buildTray();
}

let tickInterval: NodeJS.Timeout;

export function initBreaks(): void {
  powerMonitor = require("electron").powerMonitor;

  const settings = getSettings();

  if (settings.breaksEnabled) {
    createBreak();
  }

  if (tickInterval) {
    clearInterval(tickInterval);
  }

  tickInterval = setInterval(tick, 2000);
}

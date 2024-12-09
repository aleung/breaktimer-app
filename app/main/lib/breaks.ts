import moment from "moment";
import { powerMonitor } from "electron";
import log from "electron-log";

import { Settings, NotificationType } from "../../types/settings";
import { BreakTime } from "../../types/breaks";
import { IpcChannel } from "../../types/ipc";
import { sendIpc } from "./ipc";
import { getSettings } from "./store";
import { buildTray } from "./tray";
import { showNotification } from "./notifications";
import { createBreakWindows } from "./windows";

const TICK_SECONDS = 2;

let breakTime: BreakTime = null;
let havingBreak = false;
let postponedCount = 0;
let lastActiveTime = 0;

export function getBreakTime(): BreakTime {
  return breakTime;
}

export function getBreakEndTime(): Date {
  const breakStart = lastActiveTime > 0 ? lastActiveTime : Date.now();
  const breakEndTime =
    breakStart + getSeconds(new Date(getSettings().breakLength)) * 1000;
  return new Date(breakEndTime);
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

  log.info("Create next break at", breakTime.format());

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
  log.info("Postpone current break");
  postponedCount++;
  havingBreak = false;
  createBreak(true);
}

/**
 * Start a break
 */
function doBreak(): void {
  log.info("It's time to have a break");
  havingBreak = true;

  const settings = getSettings();

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
 * Check if the computer is idle long enough to reset the break
 * @returns {boolean} true to reset break
 */
function checkIdleReset(): boolean {
  const settings: Settings = getSettings();
  if (!settings.idleResetEnabled) {
    lastActiveTime = 0; // in case setting was changed
    return false;
  }

  // calculate idled time base on last active time, regardless of current idle status
  // in case the computer is just waked up from sleeping
  const idledSeconds =
    lastActiveTime > 0 ? ((Date.now() - lastActiveTime) / 1000) | 0 : 0;

  log.debug("checkIdleReset - idledSeconds:", idledSeconds);

  if (!isIdle()) {
    lastActiveTime = Date.now();
  }

  if (idledSeconds > getIdleResetSeconds()) {
    lastActiveTime = 0;
    return true;
  } else {
    return false;
  }
}

function isIdle(): boolean {
  return powerMonitor.getSystemIdleState(1) !== IdleState.Active;
}

export function startBreakNow(): void {
  log.info("Forced start break now");
  breakTime = moment();
}

function tick(): void {
  if (havingBreak) {
    // we do nothing when it's in a break
    return;
  }

  if (!getSettings().breaksEnabled) {
    // clear break if breaks are disabled
    breakTime = null;
    return;
  }

  if (checkIdleReset()) {
    breakTime = null;
    log.info("Idle reset");
  }

  if (breakTime && moment() > breakTime) {
    // it's time to have a break
    doBreak();
  } else if (!breakTime && !isIdle()) {
    // we don't create next break if it's idle currently
    createBreak();
  }

  buildTray();
}

let tickInterval: NodeJS.Timeout;

export function initBreaks(): void {
  const settings = getSettings();

  if (settings.breaksEnabled) {
    createBreak();
  }

  if (tickInterval) {
    clearInterval(tickInterval);
  }

  tickInterval = setInterval(tick, TICK_SECONDS * 1000);
}

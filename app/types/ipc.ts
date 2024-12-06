export enum IpcChannel {
  // renderer -> main
  AllowPostponeGet = "ALLOW_POSTPONE_GET",
  BreakEndTimeGet = "BREAK_END_TIME_GET",
  BreakPostpone = "BREAK_POSTPONE",
  DebugLog = "LOG",
  SettingsGet = "SETTINGS_GET",
  SettingsSet = "SETTINGS_SET",
  // renderer -> main -> renderer
  GongEndPlay = "GONG_END_PLAY",
  GongStartPlay = "GONG_START_PLAY",
}

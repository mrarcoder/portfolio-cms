"use client";

import { useState } from "react";
import Icon from "./icon";

export default function PasswordField({ id, label, hint, ...inputProps }) {
  const [visible,setVisible] = useState(false);
  const action = visible ? "Hide" : "Show";
  return <div className="field"><label htmlFor={id}>{label}</label><div className="password-control"><input {...inputProps} id={id} type={visible ? "text" : "password"}/><button type="button" onClick={() => setVisible(!visible)} aria-label={`${action} ${label.toLowerCase()}`} aria-pressed={visible} title={`${action} password`}><Icon name={visible ? "eyeOff" : "eye"}/></button></div>{hint && <small>{hint}</small>}</div>;
}

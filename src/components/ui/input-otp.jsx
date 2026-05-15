import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const InputOTP = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); InputOTP.displayName="InputOTP";
const InputOTPGroup = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); InputOTPGroup.displayName="InputOTPGroup";
const InputOTPSlot = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); InputOTPSlot.displayName="InputOTPSlot";
const InputOTPSeparator = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); InputOTPSeparator.displayName="InputOTPSeparator";
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
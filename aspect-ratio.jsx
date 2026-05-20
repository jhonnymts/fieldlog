import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const Alert = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); Alert.displayName="Alert";
const AlertTitle = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); AlertTitle.displayName="AlertTitle";
const AlertDescription = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); AlertDescription.displayName="AlertDescription";
export { Alert, AlertTitle, AlertDescription };
import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const Avatar = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); Avatar.displayName="Avatar";
const AvatarImage = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); AvatarImage.displayName="AvatarImage";
const AvatarFallback = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); AvatarFallback.displayName="AvatarFallback";
export { Avatar, AvatarImage, AvatarFallback };
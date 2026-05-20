import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const RadioGroup = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); RadioGroup.displayName="RadioGroup";
const RadioGroupItem = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); RadioGroupItem.displayName="RadioGroupItem";
export { RadioGroup, RadioGroupItem };
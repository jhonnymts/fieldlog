import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const Calendar = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); Calendar.displayName="Calendar";
export { Calendar };
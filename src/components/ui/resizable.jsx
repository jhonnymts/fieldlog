import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const ResizablePanelGroup = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); ResizablePanelGroup.displayName="ResizablePanelGroup";
const ResizablePanel = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); ResizablePanel.displayName="ResizablePanel";
const ResizableHandle = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); ResizableHandle.displayName="ResizableHandle";
export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
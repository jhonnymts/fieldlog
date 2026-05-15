import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const Tabs = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); Tabs.displayName="Tabs";
const TabsList = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); TabsList.displayName="TabsList";
const TabsTrigger = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); TabsTrigger.displayName="TabsTrigger";
const TabsContent = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); TabsContent.displayName="TabsContent";
export { Tabs, TabsList, TabsTrigger, TabsContent };
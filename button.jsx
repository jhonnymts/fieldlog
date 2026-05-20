import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const Accordion = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); Accordion.displayName="Accordion";
const AccordionItem = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); AccordionItem.displayName="AccordionItem";
const AccordionTrigger = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); AccordionTrigger.displayName="AccordionTrigger";
const AccordionContent = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); AccordionContent.displayName="AccordionContent";
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
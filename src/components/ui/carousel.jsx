import * as React from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
const Carousel = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); Carousel.displayName="Carousel";
const CarouselContent = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); CarouselContent.displayName="CarouselContent";
const CarouselItem = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); CarouselItem.displayName="CarouselItem";
const CarouselPrevious = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); CarouselPrevious.displayName="CarouselPrevious";
const CarouselNext = React.forwardRef((props, ref) => { const { className, children, ...rest } = props; return <div ref={ref} className={cn(className)} {...rest}>{children}</div>; }); CarouselNext.displayName="CarouselNext";
export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext };
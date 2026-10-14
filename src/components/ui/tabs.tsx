import * as React from 'react';
import { Tabs as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';
export function Tabs(props: React.ComponentProps<typeof Primitive.Root>) { return <Primitive.Root data-slot="tabs" {...props}/>; }
export function TabsList({ className, ...props }: React.ComponentProps<typeof Primitive.List>) { return <Primitive.List data-slot="tabs-list" className={cn('operations-tabs',className)} {...props}/>; }
export function TabsTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) { return <Primitive.Trigger data-slot="tabs-trigger" {...props}/>; }
export function TabsContent(props: React.ComponentProps<typeof Primitive.Content>) { return <Primitive.Content data-slot="tabs-content" {...props}/>; }

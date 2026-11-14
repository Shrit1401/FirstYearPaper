import * as React from "react"

type ElementWithChildren = React.ReactElement<{ children?: React.ReactNode }>

export function asChildProps(asChild: boolean | undefined, children: React.ReactNode) {
  if (!asChild || !React.isValidElement(children)) return { children }
  const child = children as ElementWithChildren
  return {
    render: React.cloneElement(child, { children: undefined }),
    children: child.props.children,
  }
}

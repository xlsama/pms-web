import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/ut-tmp')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/ut-tmp"!</div>
}

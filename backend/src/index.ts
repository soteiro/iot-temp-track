import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('One hono to rule them all!')
})

export default app

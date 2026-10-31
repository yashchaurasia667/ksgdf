import httpx

client: httpx.AsyncClient | None = None


async def startup():
    global client
    client = httpx.AsyncClient()


async def shutdown():
    await client.aclose()

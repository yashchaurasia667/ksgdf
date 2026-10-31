import httpx

client: httpx.AsyncClient | None = None


async def startup():
    global client
    client = httpx.AsyncClient(timeout=60.0)


async def shutdown():
    await client.aclose()

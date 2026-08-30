using System.Net.Http.Headers;
using System.Text.Json;

namespace NexaLauncher.Desktop;

/// <summary>
/// Produces the Xbox authentication request body with the exact media type used by
/// Microsoft's Xbox examples and by Prism Launcher. In particular, it avoids adding
/// a charset parameter to Content-Type for the legacy Xbox authentication endpoint.
/// </summary>
internal static class JsonContent
{
    public static HttpContent Create<T>(T payload)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(payload);
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        return content;
    }
}

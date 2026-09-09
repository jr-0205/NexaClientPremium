using System.Buffers.Binary;
using System.IO.Compression;
using System.Text;

namespace NexaLauncher.Desktop;

internal sealed record MinecraftSavedServer(string Name, string Address, bool HiddenAddress, bool? AcceptTextures);
internal sealed record MinecraftServerListResult(IReadOnlyList<MinecraftSavedServer> Servers, string? Error);

internal static class MinecraftServerListReader
{
    private const int MaximumFileBytes = 4 * 1024 * 1024;
    private const int MaximumCollectionLength = 10000;
    private const int MaximumDepth = 32;

    public static MinecraftServerListResult Read(string path)
    {
        if (!File.Exists(path)) return new MinecraftServerListResult(Array.Empty<MinecraftSavedServer>(), null);

        try
        {
            var info = new FileInfo(path);
            if (info.Length <= 0) return new MinecraftServerListResult(Array.Empty<MinecraftSavedServer>(), null);
            if (info.Length > MaximumFileBytes) return new MinecraftServerListResult(Array.Empty<MinecraftSavedServer>(), "servers.dat supera el tamaño máximo admitido por NEXA.");

            using var file = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            using var input = OpenPayload(file);
            var reader = new NbtReader(input);
            return new MinecraftServerListResult(reader.ReadServers(), null);
        }
        catch (Exception exception) when (exception is IOException or InvalidDataException or EndOfStreamException)
        {
            return new MinecraftServerListResult(Array.Empty<MinecraftSavedServer>(), "No se pudo interpretar servers.dat: " + exception.Message);
        }
    }

    private static Stream OpenPayload(FileStream file)
    {
        Span<byte> header = stackalloc byte[2];
        var read = file.Read(header);
        file.Position = 0;
        return read == 2 && header[0] == 0x1f && header[1] == 0x8b
            ? new GZipStream(file, CompressionMode.Decompress, leaveOpen: false)
            : file;
    }

    private sealed class NbtReader(Stream stream)
    {
        private readonly Stream input = stream;

        public IReadOnlyList<MinecraftSavedServer> ReadServers()
        {
            var rootType = ReadByte();
            if (rootType != 10) throw new InvalidDataException("La raíz NBT de servers.dat no es TAG_Compound.");
            _ = ReadString();

            var servers = new List<MinecraftSavedServer>();
            ReadRootCompound(servers, 0);
            return servers;
        }

        private void ReadRootCompound(List<MinecraftSavedServer> servers, int depth)
        {
            EnsureDepth(depth);
            while (true)
            {
                var type = ReadByte();
                if (type == 0) return;
                var name = ReadString();
                if (type == 9 && string.Equals(name, "servers", StringComparison.Ordinal))
                {
                    ReadServersList(servers, depth + 1);
                    continue;
                }
                SkipPayload(type, depth + 1);
            }
        }

        private void ReadServersList(List<MinecraftSavedServer> servers, int depth)
        {
            EnsureDepth(depth);
            var elementType = ReadByte();
            var count = ReadInt32();
            ValidateLength(count);
            if (elementType != 10)
            {
                for (var index = 0; index < count; index++) SkipPayload(elementType, depth + 1);
                return;
            }

            for (var index = 0; index < count; index++)
            {
                var server = ReadServerCompound(depth + 1);
                if (!string.IsNullOrWhiteSpace(server.Address)) servers.Add(server);
            }
        }

        private MinecraftSavedServer ReadServerCompound(int depth)
        {
            EnsureDepth(depth);
            string name = string.Empty;
            string address = string.Empty;
            var hidden = false;
            bool? acceptTextures = null;

            while (true)
            {
                var type = ReadByte();
                if (type == 0) break;
                var tagName = ReadString();
                switch (type)
                {
                    case 1 when tagName == "hideAddress":
                        hidden = ReadByte() != 0;
                        break;
                    case 1 when tagName == "acceptTextures":
                        acceptTextures = ReadByte() != 0;
                        break;
                    case 8 when tagName == "name":
                        name = ReadString();
                        break;
                    case 8 when tagName == "ip":
                        address = ReadString();
                        break;
                    default:
                        SkipPayload(type, depth + 1);
                        break;
                }
            }

            return new MinecraftSavedServer(
                string.IsNullOrWhiteSpace(name) ? address : name.Trim(),
                address.Trim(),
                hidden,
                acceptTextures);
        }

        private void SkipPayload(byte type, int depth)
        {
            EnsureDepth(depth);
            switch (type)
            {
                case 0: return;
                case 1: Skip(1); return;
                case 2: Skip(2); return;
                case 3: Skip(4); return;
                case 4: Skip(8); return;
                case 5: Skip(4); return;
                case 6: Skip(8); return;
                case 7:
                    SkipArray(1);
                    return;
                case 8:
                    _ = ReadString();
                    return;
                case 9:
                {
                    var elementType = ReadByte();
                    var count = ReadInt32();
                    ValidateLength(count);
                    for (var index = 0; index < count; index++) SkipPayload(elementType, depth + 1);
                    return;
                }
                case 10:
                    while (true)
                    {
                        var childType = ReadByte();
                        if (childType == 0) return;
                        _ = ReadString();
                        SkipPayload(childType, depth + 1);
                    }
                case 11:
                    SkipArray(4);
                    return;
                case 12:
                    SkipArray(8);
                    return;
                default:
                    throw new InvalidDataException($"Tipo NBT no compatible: {type}.");
            }
        }

        private void SkipArray(int elementBytes)
        {
            var count = ReadInt32();
            ValidateLength(count);
            checked { Skip(count * elementBytes); }
        }

        private string ReadString()
        {
            Span<byte> lengthBuffer = stackalloc byte[2];
            ReadExactly(lengthBuffer);
            var length = BinaryPrimitives.ReadUInt16BigEndian(lengthBuffer);
            if (length == 0) return string.Empty;
            var bytes = new byte[length];
            ReadExactly(bytes);
            return Encoding.UTF8.GetString(bytes);
        }

        private int ReadInt32()
        {
            Span<byte> buffer = stackalloc byte[4];
            ReadExactly(buffer);
            return BinaryPrimitives.ReadInt32BigEndian(buffer);
        }

        private byte ReadByte()
        {
            var value = input.ReadByte();
            if (value < 0) throw new EndOfStreamException("El archivo NBT terminó antes de lo esperado.");
            return (byte)value;
        }

        private void Skip(int bytes)
        {
            if (bytes < 0) throw new InvalidDataException("Longitud NBT inválida.");
            Span<byte> buffer = stackalloc byte[1024];
            var remaining = bytes;
            while (remaining > 0)
            {
                var take = Math.Min(remaining, buffer.Length);
                ReadExactly(buffer[..take]);
                remaining -= take;
            }
        }

        private void ReadExactly(Span<byte> buffer)
        {
            var offset = 0;
            while (offset < buffer.Length)
            {
                var read = input.Read(buffer[offset..]);
                if (read <= 0) throw new EndOfStreamException("El archivo NBT terminó antes de lo esperado.");
                offset += read;
            }
        }

        private static void ValidateLength(int count)
        {
            if (count < 0 || count > MaximumCollectionLength) throw new InvalidDataException("La colección NBT tiene una longitud no válida.");
        }

        private static void EnsureDepth(int depth)
        {
            if (depth > MaximumDepth) throw new InvalidDataException("El NBT excede la profundidad máxima admitida.");
        }
    }
}

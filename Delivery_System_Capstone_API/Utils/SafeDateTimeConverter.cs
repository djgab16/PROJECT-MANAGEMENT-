using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SPXDeliveryAPI.Utils
{
    public class SafeDateTimeConverter : JsonConverter<DateTime>
    {
        private static readonly string[] Formats = new[]
        {
            "yyyy-MM-ddTHH:mm:ss.fffZ",
            "yyyy-MM-ddTHH:mm:ss.ffffffZ",
            "yyyy-MM-ddTHH:mm:ssZ",
            "yyyy-MM-ddTHH:mm:ss.fffzzz",
            "yyyy-MM-ddTHH:mm:ss",
            "yyyy-MM-dd",
            "MMMM dd, yyyy",
            "M/d/yyyy, h:mm:ss tt",
            "MM/dd/yyyy, hh:mm:ss tt",
            "M/d/yyyy h:mm:ss tt",
            "MM/dd/yyyy hh:mm:ss tt"
        };

        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.String)
            {
                var stringValue = reader.GetString();
                if (string.IsNullOrWhiteSpace(stringValue))
                {
                    return DateTime.MinValue;
                }

                if (DateTime.TryParse(stringValue, out var parsedDateTime))
                {
                    return parsedDateTime.ToUniversalTime();
                }

                foreach (var format in Formats)
                {
                    if (DateTime.TryParseExact(stringValue, format, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal, out var exactDateTime))
                    {
                        return exactDateTime.ToUniversalTime();
                    }
                }
            }

            return reader.GetDateTime().ToUniversalTime();
        }

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
        }
    }

    public class SafeNullableDateTimeConverter : JsonConverter<DateTime?>
    {
        private readonly SafeDateTimeConverter _innerConverter = new SafeDateTimeConverter();

        public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                return null;
            }
            if (reader.TokenType == JsonTokenType.String && string.IsNullOrWhiteSpace(reader.GetString()))
            {
                return null;
            }

            return _innerConverter.Read(ref reader, typeof(DateTime), options);
        }

        public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
        {
            if (value.HasValue)
            {
                _innerConverter.Write(writer, value.Value, options);
            }
            else
            {
                writer.WriteNullValue();
            }
        }
    }
}

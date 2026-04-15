# ── Build stage ─────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY PersonTrack.API.csproj .
RUN dotnet restore --locked-mode 2>/dev/null || dotnet restore

COPY . .
RUN dotnet publish -c Release -o /out --no-restore

# ── Runtime stage ────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Install curl for healthcheck + create non-root user
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser

COPY --from=build /out .
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -sf http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "PersonTrack.API.dll"]

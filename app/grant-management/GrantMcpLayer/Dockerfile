FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
ARG APP_UID=1654
WORKDIR /app
# Ensure data directory exists and has correct ownership before dropping privileges
RUN mkdir -p /app/data && chown -R $APP_UID:$APP_UID /app
USER $APP_UID
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["GrantMcpLayer/GrantMcpLayer.csproj", "GrantMcpLayer/"]
RUN dotnet restore "GrantMcpLayer/GrantMcpLayer.csproj"
COPY . .
WORKDIR "/src/GrantMcpLayer"
RUN dotnet build "./GrantMcpLayer.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./GrantMcpLayer.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "GrantMcpLayer.dll"]

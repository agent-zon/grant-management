FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
ARG APP_UID=1654
WORKDIR /app
# Create data directory before switching to non-root user
RUN mkdir -p /app/data && chown -R $APP_UID:$APP_UID /app/data /app
USER $APP_UID
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy Directory.Build files first - they define shared properties for all projects
COPY ["app/grant-management/Directory.Build.props", "./"]
COPY ["app/grant-management/Directory.Build.targets", "./"]
COPY ["app/grant-management/Directory.Packages.props", "./"]

# Copy project files
COPY ["app/grant-management/GrantManagementServer/GrantManagementServer.csproj", "GrantManagementServer/"]
COPY ["app/common/Common.csproj", "common/"]
COPY ["app/grant-management/GrantManagement.ServiceDefaults/GrantManagement.ServiceDefaults.csproj", "GrantManagement.ServiceDefaults/"]

RUN dotnet restore "GrantManagementServer/GrantManagementServer.csproj"

# Copy source files
COPY ["app/grant-management/GrantManagementServer/", "GrantManagementServer/"]
COPY ["app/common/", "common/"]
COPY ["app/grant-management/GrantManagement.ServiceDefaults/", "GrantManagement.ServiceDefaults/"]

WORKDIR "/src/GrantManagementServer"
RUN dotnet build "./GrantManagementServer.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./GrantManagementServer.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "GrantManagementServer.dll"]

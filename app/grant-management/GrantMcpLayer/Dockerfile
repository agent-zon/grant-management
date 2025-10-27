FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
ARG APP_UID=1654
USER $APP_UID
WORKDIR /app
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
COPY ["app/grant-management/GrantMcpLayer/GrantMcpLayer.csproj", "GrantMcpLayer/"]
COPY ["app/common/Common.csproj", "common/"]
COPY ["app/grant-management/GrantManagement.ServiceDefaults/GrantManagement.ServiceDefaults.csproj", "GrantManagement.ServiceDefaults/"]

RUN dotnet restore "GrantMcpLayer/GrantMcpLayer.csproj"

# Copy source files
COPY ["app/grant-management/GrantMcpLayer/", "GrantMcpLayer/"]
COPY ["app/common/", "common/"]
COPY ["app/grant-management/GrantManagement.ServiceDefaults/", "GrantManagement.ServiceDefaults/"]

WORKDIR "/src/GrantMcpLayer"
RUN dotnet build "./GrantMcpLayer.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./GrantMcpLayer.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "GrantMcpLayer.dll"]

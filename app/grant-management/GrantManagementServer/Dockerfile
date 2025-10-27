FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["grant-management/GrantManagementServer/GrantManagementServer.csproj", "GrantManagementServer/"]
COPY ["common/Common.csproj", "/common/"]
COPY ["grant-management/GrantManagement.ServiceDefaults/GrantManagement.ServiceDefaults.csproj", "GrantManagement.ServiceDefaults/"]
RUN dotnet restore "GrantManagementServer/GrantManagementServer.csproj"
COPY ["grant-management/GrantManagementServer/", "GrantManagementServer/"]
COPY ["common/", "/common/"]
COPY ["grant-management/GrantManagement.ServiceDefaults/", "GrantManagement.ServiceDefaults/"]
WORKDIR "/src/GrantManagementServer"
RUN dotnet build "./GrantManagementServer.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./GrantManagementServer.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "GrantManagementServer.dll"]

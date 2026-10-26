# One container with everything: the .NET API (panchang, muhurat, PanditJi) and the Angular website.
#   docker build -t vedic-pandit .
#   docker run -p 8080:8080 -e Claude__ApiKey=sk-ant-... -v vp-data:/data vedic-pandit
# The backend uses no NuGet packages, so restore needs no network beyond the base images.

# --- Angular build ---
FROM node:22-alpine AS web
WORKDIR /web
COPY vedic-pandit-client/package*.json ./
RUN npm ci --no-audit --no-fund
COPY vedic-pandit-client/ ./
RUN npx ng build --configuration production

# --- .NET build + tests ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS api
WORKDIR /src
COPY VedicPandit.sln ./
COPY src/ src/
COPY tests/ tests/
RUN dotnet run --project tests/VedicPandit.Tests -c Release
RUN dotnet publish src/VedicPandit.WebAPI/VedicPandit.WebAPI.csproj -c Release -o /out
COPY --from=web /web/dist/vedic-pandit-client/browser /out/wwwroot

# --- runtime ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=api /out .
ENV ASPNETCORE_URLS=http://+:8080 \
    Content__DataFolder=/data
VOLUME /data
EXPOSE 8080
ENTRYPOINT ["dotnet", "VedicPandit.WebAPI.dll"]

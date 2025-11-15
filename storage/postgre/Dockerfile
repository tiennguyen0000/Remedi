FROM postgres:15

# Install curl for API calls
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy initialization scripts
COPY ./init/*.sql /docker-entrypoint-initdb.d/

# Set environment variables
ENV POSTGRES_DB=medicine_recycling
ENV POSTGRES_USER=admin
ENV POSTGRES_PASSWORD=admin123

# Expose the PostgreSQL port
EXPOSE 5432
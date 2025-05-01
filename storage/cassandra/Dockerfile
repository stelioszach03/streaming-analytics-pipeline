FROM cassandra:4.1

# Copy custom configuration files
COPY cassandra.yaml /etc/cassandra/cassandra.yaml
COPY jvm.options /etc/cassandra/jvm.options

# Copy schema initialization script
COPY schema.cql /schema.cql
COPY init-script.sh /docker-entrypoint-initdb.d/

# Set permissions for init script
RUN chmod +x /docker-entrypoint-initdb.d/init-script.sh

# Expose Cassandra ports
EXPOSE 7000 7001 7199 9042 9160

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=5 \
  CMD cqlsh -e "SELECT now() FROM system.local" || exit 1

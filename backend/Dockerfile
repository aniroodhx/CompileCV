FROM eclipse-temurin:21-jdk-jammy

RUN apt-get update && apt-get install -y curl maven && \
    curl -L https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz \
    | tar -xz -C /usr/local/bin && \
    chmod +x /usr/local/bin/tectonic

WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

EXPOSE 8080
CMD ["java", "-jar", "target/compilecv-0.0.1-SNAPSHOT.jar"]

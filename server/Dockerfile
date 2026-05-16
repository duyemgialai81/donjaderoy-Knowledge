# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy pom.xml và download dependencies (tận dụng cache)
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy source code và build
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run - dùng JRE Alpine nhẹ
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy jar đã build từ stage trước (tên jar lấy từ log: the-autumn-0.0.1-SNAPSHOT.jar)
COPY --from=builder /app/target/the-autumn-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

# Tối ưu memory cho container
CMD ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
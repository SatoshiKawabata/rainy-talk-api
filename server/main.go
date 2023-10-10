package main

import (
	"chat-ata/models"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
)

type Response struct {
	Message string `json:"message"`
}

var db *sql.DB

func init() {
	log.Default().Println("Initializing database...")
	var err error
	db, err = sql.Open("sqlite3", "./db/chat_system.db")
	if err != nil {
		log.Fatal(err)
	}
	initDB()
}

func initDB() {
	// SQLファイルを読み込みます
	sqlBytes, err := os.ReadFile("./sql/initialize.sql")
	if err != nil {
		fmt.Println("Error reading SQL file:", err)
		return
	}

	// SQLファイルの内容を文字列に変換します
	sqlStatements := string(sqlBytes)

	// セミコロンで分割して各クエリを実行します
	for _, statement := range strings.Split(sqlStatements, ";") {
		statement = strings.TrimSpace(statement) // 余白を削除
		if statement == "" {
			continue // 空のクエリをスキップ
		}

		_, err := db.Exec(statement)
		if err != nil {
			fmt.Printf("Error executing SQL statement: %s\nStatement: %s\n", err, statement)
			return
		}
	}
}

func main() {
	defer cleanup()
	r := gin.Default()

	r.GET("/", homeEndpoint)

	r.POST("/users", func(c *gin.Context) {
		var user models.User
		if err := c.BindJSON(&user); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}
		if err := user.Insert(c, db); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, user)
	})

	r.GET("/users", func(c *gin.Context) {
		var users []models.User

		rows, err := db.Query("SELECT id, username FROM users")
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		for rows.Next() {
			var user models.User
			if err := rows.Scan(&user.ID, &user.Username); err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			users = append(users, user)
		}

		c.JSON(200, users)
	})
	r.Run(":8080")
}

func homeEndpoint(c *gin.Context) {
	response := Response{Message: "Welcome to the API!"}
	c.JSON(200, response)
}

func cleanup() {
	if db != nil {
		db.Close()
	}
}
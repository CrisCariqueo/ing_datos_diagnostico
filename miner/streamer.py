import json
import redis
import os

class RedisStreamer:
    def __init__(self):
        host = os.environ.get("REDIS_HOST", "localhost")
        port = int(os.environ.get("REDIS_PORT", 6379))
        self.r = redis.Redis(host=host, port=port, decode_responses=True)
        self.channel = "github_words"

    def emit_word(self, word, repo, language):
        """
        Emits a single word to the Redis pub/sub channel.
        """
        message = {
            "word": word,
            "repo": repo,
            "language": language
        }
        self.r.publish(self.channel, json.dumps(message))

    def emit_words(self, words, repo, language):
        """
        Batch-emits words individually to the channel (incremental streaming)
        """
        for word in words:
            self.emit_word(word, repo, language)

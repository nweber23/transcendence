#include "interface.hpp"
#include "engine.grpc.pb.h"

#include <grpcpp/grpcpp.h>
#include <iostream>

/**
 * @class GameEngineServiceImpl
 * @brief gRPC service implementation that exposes the game engine over the
 *        GameEngine service defined in engine.proto.
 *
 * Acts as a thin translation layer between the protobuf request/response
 * types and the Engine facade: every RPC maps the incoming request to an
 * Engine call and packages the resulting JSON game state into a
 * GameResponse. All rule errors are reported as success=false with an empty
 * game_state_json rather than a gRPC error status.
 */
class GameEngineServiceImpl final : public engine::GameEngine::Service {
    Engine& engine_;

public:
    /**
     * @brief Constructs the service with a reference to the shared Engine.
     * @param engine The engine instance backing all game logic.
     */
    explicit GameEngineServiceImpl(Engine& engine)
        : engine_(engine) {}

    /**
     * @brief Handles blackjack actions (create/hit/stand).
     * @param ctx The gRPC server context (unused).
     * @param req The incoming blackjack request.
     * @param res The response to fill with success and JSON game state.
     * @return gRPC status; always OK, failures are signalled via res->success().
     */
    grpc::Status BlackjackAction(grpc::ServerContext*,
                                 const engine::BlackjackRequest* req,
                                 engine::GameResponse* res) override {
        auto game_id = std::to_string(req->game_id());
        std::string json;

        try {
            if (req->action() == "create") {
                json = engine_.create_blackjack(game_id, req->bet());
            } else if (req->action() == "hit") {
                json = engine_.blackjack_hit(game_id);
            } else if (req->action() == "stand") {
                json = engine_.blackjack_stand(game_id);
            } else {
                res->set_success(false);
                return grpc::Status::OK;
            }
        } catch (...) {
            res->set_success(false);
            return grpc::Status::OK;
        }

        res->set_success(!json.empty());
        res->set_game_state_json(json);
        return grpc::Status::OK;
    }

    /**
     * @brief Handles Texas Hold'em actions (create/close/post_blinds/act).
     * @param ctx The gRPC server context (unused).
     * @param req The incoming Texas request.
     * @param res The response to fill with success and JSON game state.
     * @return gRPC status; always OK, failures are signalled via res->success().
     */
    grpc::Status TexasAction(grpc::ServerContext*,
                             const engine::TexasRequest* req,
                             engine::GameResponse* res) override {
        auto game_id = std::to_string(req->game_id());
        auto player_idx = static_cast<std::size_t>(req->player_id());

        if (req->action() == "close") {
            bool closed = false;
            try {
                closed = engine_.texas_close(game_id);
            } catch (...) {
                closed = false;
            }
            res->set_success(closed);
            res->set_game_state_json("");
            return grpc::Status::OK;
        }

        std::string json;

        try {
            if (req->action() == "create") {
                if (req->stacks_size() > 0) {
                    std::vector<std::int64_t> stacks(req->stacks().begin(), req->stacks().end());
                    json = engine_.create_texas(game_id, stacks);
                } else {
                    json = engine_.create_texas(game_id, req->num_players(), req->amount());
                }
            } else if (req->action() == "post_blinds") {
                json = engine_.texas_post_blinds(game_id, req->small_blind(), req->big_blind());
            } else if (req->action() == "fold" || req->action() == "check" ||
                       req->action() == "call" || req->action() == "raise" ||
                       req->action() == "all_in") {
                json = engine_.texas_act(game_id, player_idx, req->action(), req->amount());
            } else {
                res->set_success(false);
                return grpc::Status::OK;
            }
        } catch (...) {
            res->set_success(false);
            return grpc::Status::OK;
        }

        res->set_success(!json.empty());
        res->set_game_state_json(json);
        return grpc::Status::OK;
    }

    /**
     * @brief Handles slot machine spins.
     * @param ctx The gRPC server context (unused).
     * @param req The incoming slot request.
     * @param res The response to fill with success and JSON game state.
     * @return gRPC status; always OK, failures are signalled via res->success().
     */
    grpc::Status SlotsAction(grpc::ServerContext*,
                             const engine::SlotsRequest* req,
                             engine::GameResponse* res) override {
        std::string json;

        try {
            json = engine_.run_slot(req->config_name(),
                                    static_cast<std::uint8_t>(req->line_count()),
                                    req->bet_per_line());
        } catch (...) {
            res->set_success(false);
            return grpc::Status::OK;
        }

        res->set_success(!json.empty());
        res->set_game_state_json(json);
        return grpc::Status::OK;
    }
};

/**
 * @brief Entry point of the engine service.
 * @return 0 on graceful shutdown.
 *
 * Creates the Engine instance, binds the gRPC server to 0.0.0.0:ENGINE_PORT
 * (defaults to 777 when the environment variable is unset), registers the
 * service and blocks until the server is stopped.
 */
int main() {
    Engine engine;

    auto port = std::getenv("ENGINE_PORT");
    auto address = "0.0.0.0:" + (port ? std::string(port) : "777");

    GameEngineServiceImpl service(engine);

    grpc::ServerBuilder builder;
    builder.AddListeningPort(address, grpc::InsecureServerCredentials());
    builder.RegisterService(&service);

    auto server = builder.BuildAndStart();
    std::cout << "Engine listening on " << address << std::endl;

    server->Wait();
    return 0;
}

#include "interface.hpp"
#include "engine.grpc.pb.h"

#include <grpcpp/grpcpp.h>
#include <iostream>

class GameEngineServiceImpl final : public engine::GameEngine::Service {
    Engine& engine_;

public:
    explicit GameEngineServiceImpl(Engine& engine)
        : engine_(engine) {}

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

    grpc::Status TexasAction(grpc::ServerContext*,
                             const engine::TexasRequest* req,
                             engine::GameResponse* res) override {
        auto game_id = std::to_string(req->game_id());
        auto player_idx = static_cast<std::size_t>(req->player_id());
        std::string json;

        try {
            if (req->action() == "create") {
                json = engine_.create_texas(game_id, req->num_players(), req->amount());
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
